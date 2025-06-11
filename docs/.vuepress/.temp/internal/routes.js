export const redirects = JSON.parse("{}")

export const routes = Object.fromEntries([
  ["/", { loader: () => import(/* webpackChunkName: "index.html" */"/Users/thomas.schultz/Documents/code/stormmsite/docs/.vuepress/.temp/pages/index.html.js"), meta: {"title":"Home"} }],
  ["/contents.html", { loader: () => import(/* webpackChunkName: "contents.html" */"/Users/thomas.schultz/Documents/code/stormmsite/docs/.vuepress/.temp/pages/contents.html.js"), meta: {"title":"Table of Contents"} }],
  ["/dev-philosophy.html", { loader: () => import(/* webpackChunkName: "dev-philosophy.html" */"/Users/thomas.schultz/Documents/code/stormmsite/docs/.vuepress/.temp/pages/dev-philosophy.html.js"), meta: {"title":"The STORMM View of Coding for Molecular Science"} }],
  ["/dev-tutorials.html", { loader: () => import(/* webpackChunkName: "dev-tutorials.html" */"/Users/thomas.schultz/Documents/code/stormmsite/docs/.vuepress/.temp/pages/dev-tutorials.html.js"), meta: {"title":"Tutorials for Developers"} }],
  ["/get-started.html", { loader: () => import(/* webpackChunkName: "get-started.html" */"/Users/thomas.schultz/Documents/code/stormmsite/docs/.vuepress/.temp/pages/get-started.html.js"), meta: {"title":"Getting Started with STORMM"} }],
  ["/stormm-md.html", { loader: () => import(/* webpackChunkName: "stormm-md.html" */"/Users/thomas.schultz/Documents/code/stormmsite/docs/.vuepress/.temp/pages/stormm-md.html.js"), meta: {"title":"Molecular Dynamics in STORMM"} }],
  ["/why-stormm.html", { loader: () => import(/* webpackChunkName: "why-stormm.html" */"/Users/thomas.schultz/Documents/code/stormmsite/docs/.vuepress/.temp/pages/why-stormm.html.js"), meta: {"title":"Why choose STORMM?"} }],
  ["/installation/docker.html", { loader: () => import(/* webpackChunkName: "installation_docker.html" */"/Users/thomas.schultz/Documents/code/stormmsite/docs/.vuepress/.temp/pages/installation/docker.html.js"), meta: {"title":"Alternate Installation Instructions: Docker"} }],
  ["/tutorials/tutorial_i.html", { loader: () => import(/* webpackChunkName: "tutorials_tutorial_i.html" */"/Users/thomas.schultz/Documents/code/stormmsite/docs/.vuepress/.temp/pages/tutorials/tutorial_i.html.js"), meta: {"title":"A Basic GPU Program in STORMM"} }],
  ["/tutorials/tutorial_ii.html", { loader: () => import(/* webpackChunkName: "tutorials_tutorial_ii.html" */"/Users/thomas.schultz/Documents/code/stormmsite/docs/.vuepress/.temp/pages/tutorials/tutorial_ii.html.js"), meta: {"title":"A Random Walk Simulator in STORMM"} }],
  ["/tutorials/tutorial_iii.html", { loader: () => import(/* webpackChunkName: "tutorials_tutorial_iii.html" */"/Users/thomas.schultz/Documents/code/stormmsite/docs/.vuepress/.temp/pages/tutorials/tutorial_iii.html.js"), meta: {"title":"Creating Your Own Input Blocks"} }],
  ["/tutorials/tutorial_iv.html", { loader: () => import(/* webpackChunkName: "tutorials_tutorial_iv.html" */"/Users/thomas.schultz/Documents/code/stormmsite/docs/.vuepress/.temp/pages/tutorials/tutorial_iv.html.js"), meta: {"title":"The Molecular Mechanics Workbench: Creating and Unpacking STORMM's Topologies and Coordinates"} }],
  ["/404.html", { loader: () => import(/* webpackChunkName: "404.html" */"/Users/thomas.schultz/Documents/code/stormmsite/docs/.vuepress/.temp/pages/404.html.js"), meta: {"title":""} }],
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
