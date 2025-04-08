import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import ThreeCanvas from '../components/ThreeCanvas.vue'

export default {
	extends: DefaultTheme,
	enhanceApp({ app }) {
		app.component('ThreeCanvas', ThreeCanvas)
	}
}