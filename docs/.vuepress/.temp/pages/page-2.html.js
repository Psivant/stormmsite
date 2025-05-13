import comp from "/Users/kushagra.srivastava/Documents/vue/StormmSite/docs/.vuepress/.temp/pages/page-2.html.vue"
const data = JSON.parse("{\"path\":\"/page-2.html\",\"title\":\"STORMM Conventions\",\"lang\":\"en-US\",\"frontmatter\":{},\"headers\":[],\"git\":{},\"filePathRelative\":\"page-2.md\"}")
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
