import { defaultTheme } from '@vuepress/theme-default'
import { defineUserConfig } from 'vuepress/cli'
import { viteBundler } from '@vuepress/bundler-vite'

export default defineUserConfig({
  lang: 'en-US',

  title: 'STORMM',
  description: 'Structure and TOpology Replica Molecular Mechanics',

  theme: defaultTheme({
    logo: '',

    navbar: ['/', '/get-started', '/contents'],
  }),

  bundler: viteBundler(),
  base: "/stormmsite/",
})
