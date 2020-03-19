const Page = require('../../Page')
const App = require('../../App')

const {
  getMarkdown,
  getDocument,
  readFile
} = require('./util')

let app
let computed

beforeAll(async () => {
  app = new App()
  await app.process()
  computed = new app.ClientComputedMixinConstructor()
})

async function setupPage (options, processOption = {}) {
  const page = new Page(options, app)
  await page.process({ computed, ...processOption })
  return page
}

describe('pure route', () => {
  test('should get pure route', async () => {
    const page = await setupPage({ path: '/' })

    expect(page.path).toBe('/')
    expect(page.regularPath).toBe('/')
    expect(page.frontmatter).toEqual({})
  })

  test('should encode the path', async () => {
    const path = '/尤/'
    const encodePath = encodeURI(path)
    const page = await setupPage({ path })

    expect(page.path).toBe(encodePath)
    expect(page.regularPath).toBe(encodePath)
  })

  test('should be able to set custom frontmatter', async () => {
    const frontmatter = { foo: 'alpha' }
    const page = await setupPage({
      path: '/',
      frontmatter
    })

    expect(page.frontmatter.foo).toBe(frontmatter.foo)
  })

  test('should be able to use enhancers', async () => {
    const frontmatter = { title: 'alpha' }
    const enhancers = [
      {
        name: 'plugin-a',
        value: page => {
          page.frontmatter.title = 'beta'
        }
      }
    ]
    const page = await setupPage({ path: '/', frontmatter }, { enhancers })

    expect(page.frontmatter.title).toBe('beta')
  })
})

describe('permalink', () => {
  test('should be able to set permalink', async () => {
    const page = await setupPage({ permalink: '/permalink' })

    expect(page.path).toBe('/permalink')
    expect(page.regularPath).toBe('/permalink')
  })

  test('should be able to set permalink from frontmatter', async () => {
    const frontmatter = { permalink: '/permalink' }
    const page = await setupPage({ path: '/', frontmatter })

    expect(page.path).toBe('/permalink/')
    expect(page.regularPath).toBe('/')
  })
})

describe('markdown page', () => {
  test('should be able to pointing to a markdown file', async () => {
    const { relative, filePath } = getDocument('README.md')
    const markdown = getMarkdown()
    const page = await setupPage({ filePath, relative }, { markdown })

    expect(page._filePath).toBe(filePath)
    expect(page.regularPath).toBe('/')
    expect(page.path).toBe('/')
    expect(page.frontmatter).toEqual({})

    const content = await readFile(filePath)

    expect(page._content).toBe(content)
    expect(page._strippedContent).toBe(content)
  })

  test('should work with frontmatter when pointing to a markdown file', async () => {
    const { relative, filePath } = getDocument('alpha.md')
    const title = 'VuePress Alpha' // from fixture
    const markdown = getMarkdown()
    const page = await setupPage({ filePath, relative }, { markdown })

    expect(page._filePath).toBe(filePath)
    expect(page.regularPath).toBe('/alpha.html')
    expect(page.path).toBe('/alpha.html')
    expect(page.frontmatter.title).toBe(title)
    expect(page._content.startsWith('---')).toBe(true)
    expect(page._strippedContent.startsWith('---')).toBe(false)
  })
})

describe('title', () => {
  test('should be able to set title', async () => {
    const title = 'VuePress'
    const page = await setupPage({ path: '/', title })
    expect(page.title).toBe(title)
  })

  test('should set title from frontmatter', async () => {
    const title = 'VuePress Alpha' // from fixture
    const { relative, filePath } = getDocument('alpha.md')
    const markdown = getMarkdown()
    const page = await setupPage({ filePath, relative }, { markdown })
    expect(page.title).toBe(title)
  })

  test('should use first header in markdown to set title ', async () => {
    const title = 'Home' // from fixture
    const { relative, filePath } = getDocument('README.md')
    const markdown = getMarkdown()
    const page = await setupPage({ filePath, relative }, { markdown })
    expect(page.title).toBe(title)
  })
})

describe('enhancer', () => {
  test('should loop over sync enhancers', async () => {
    const page = await setupPage({ path: '/' })
    const enhancers = [
      {
        name: 'foo',
        value: jest.fn()
      },
      {
        name: 'foo',
        value: jest.fn()
      }
    ]
    await page.enhance(enhancers)

    return enhancers.map(enhancer => expect(enhancer.value).toHaveBeenCalled())
  })

  test('should loop over sync and async enhancers', async () => {
    const page = await setupPage({ path: '/' })
    const enhancers = [
      {
        name: 'foo',
        value: jest.fn()
      },
      {
        name: 'foo',
        value: jest.fn()
      }
    ]
    const mixedEnhancers = [...enhancers, {
      name: 'blog',
      value: jest.fn().mockResolvedValue({})
    }]
    await page.enhance(mixedEnhancers)

    return mixedEnhancers.map(enhancer => expect(enhancer.value).toHaveBeenCalled())
  })

  test('should log and throw an error when enhancing fails', async () => {
    global.console.log = jest.fn()
    const pluginName = 'error-plugin'

    const page = await setupPage({ path: '/' })
    const error = { errorMessage: 'this is an error message' }

    await expect(page.enhance([{
      name: pluginName,
      value: jest.fn().mockRejectedValue(error)
    }])).rejects.toThrowError(`[${pluginName}] execute extendPageData failed.`)

    expect(console.log).toHaveBeenCalledWith(error)
  })
})

// TODO permalink - driven by global pattern
// TODO I18n
// TODO Meta
// TODO Add a page with explicit content
// TODO Excerpt
// TODO SFC
// TODO Headers

// TODO get date
// TODO get strippedFilename
// TODO get slug
// TODO get filename
// TODO get dirname
