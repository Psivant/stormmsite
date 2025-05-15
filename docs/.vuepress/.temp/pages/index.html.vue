<template><div><!-- 
This is the content of home page. Check [Home Page Docs][default-theme-home] for more details.

[default-theme-home]: https://vuejs.press/reference/default-theme/frontmatter.html#home-page -->
<div class="vp-features">
  <div class="vp-feature" v-for="feat in $frontmatter.xfeatures" :key="feat.title">
    <h2><a :href="feat.link" rel="noopener">{{ feat.title }}</a></h2>
    <p>{{ feat.details }}</p>
  </div>
</div>
</div></template>


