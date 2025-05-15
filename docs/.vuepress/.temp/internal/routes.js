export const redirects = JSON.parse("{}")

export const routes = Object.fromEntries([
  ["/", { loader: () => import(/* webpackChunkName: "index.html" */"/Users/kushagra.srivastava/Documents/GitHub/StormmSite/docs/.vuepress/.temp/pages/index.html.js"), meta: {"title":"Home"} }],
  ["/contents.html", { loader: () => import(/* webpackChunkName: "contents.html" */"/Users/kushagra.srivastava/Documents/GitHub/StormmSite/docs/.vuepress/.temp/pages/contents.html.js"), meta: {"title":"Table of Contents"} }],
  ["/get-started.html", { loader: () => import(/* webpackChunkName: "get-started.html" */"/Users/kushagra.srivastava/Documents/GitHub/StormmSite/docs/.vuepress/.temp/pages/get-started.html.js"), meta: {"title":"Getting Started with STORMM"} }],
  ["/stormm-md.html", { loader: () => import(/* webpackChunkName: "stormm-md.html" */"/Users/kushagra.srivastava/Documents/GitHub/StormmSite/docs/.vuepress/.temp/pages/stormm-md.html.js"), meta: {"title":"Molecular Dynamics in STORMM"} }],
  ["/why-stormm.html", { loader: () => import(/* webpackChunkName: "why-stormm.html" */"/Users/kushagra.srivastava/Documents/GitHub/StormmSite/docs/.vuepress/.temp/pages/why-stormm.html.js"), meta: {"title":"Why choose STORMM?"} }],
  ["/installation/docker.html", { loader: () => import(/* webpackChunkName: "installation_docker.html" */"/Users/kushagra.srivastava/Documents/GitHub/StormmSite/docs/.vuepress/.temp/pages/installation/docker.html.js"), meta: {"title":"Alternate Installation Instructions: Docker"} }],
  ["/404.html", { loader: () => import(/* webpackChunkName: "404.html" */"/Users/kushagra.srivastava/Documents/GitHub/StormmSite/docs/.vuepress/.temp/pages/404.html.js"), meta: {"title":""} }],
]);

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
  if (__VUE_HMR_RUNTIME__.updateRoutes) {
    __VUE_HMR_RUNTIME__.updateRoutes(routes)
  }
  if (__VUE_HMR_RUNTIME__.updateRedirects) {
    __VUE_HMR_RUNTIME__.updateRedirects(redirects)
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(({ routes, redirects }) => {
    __VUE_HMR_RUNTIME__.updateRoutes(routes)
    __VUE_HMR_RUNTIME__.updateRedirects(redirects)
  })
}
