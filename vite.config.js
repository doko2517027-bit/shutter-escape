import {defineConfig} from 'vite'
export default defineConfig({server:{proxy:{'/api':'http://127.0.0.1:3107','/socket':{target:'ws://127.0.0.1:3107',ws:true}}}})
