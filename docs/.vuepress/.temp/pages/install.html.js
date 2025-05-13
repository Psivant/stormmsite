import comp from "/Users/kushagra.srivastava/Documents/vue/StormmSite/docs/.vuepress/.temp/pages/install.html.vue"
const data = JSON.parse("{\"path\":\"/install.html\",\"title\":\"STORMM Conventions\",\"lang\":\"en-US\",\"frontmatter\":{},\"headers\":[],\"git\":{},\"filePathRelative\":\"install.md\"}")
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
