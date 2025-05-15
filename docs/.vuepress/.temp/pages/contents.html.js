import comp from "/Users/kushagra.srivastava/Documents/GitHub/StormmSite/docs/.vuepress/.temp/pages/contents.html.vue"
const data = JSON.parse("{\"path\":\"/contents.html\",\"title\":\"Table of Contents\",\"lang\":\"en-US\",\"frontmatter\":{},\"headers\":[],\"git\":{\"updatedTime\":1747168965000},\"filePathRelative\":\"contents.md\"}")
export { comp, data }

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
  if (__VUE_HMR_RUNTIME__.updatePageData) {
    __VUE_HMR_RUNTIME__.updatePageData(data)
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(({ data }) => {
    __VUE_HMR_RUNTIME__.updatePageData(data)
  })
}
