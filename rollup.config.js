import flow from 'rollup-plugin-flow'
import babel from 'rollup-plugin-babel'
import external from 'rollup-plugin-auto-external'
import prettier from 'rollup-plugin-prettier'
import uglify from 'rollup-plugin-uglify'
import { minify } from 'uglify-es'

const input = `./index.js`
const file = mid => `dist/${mid}.js`

export default [
  {
    input,
    output: [
      { format: 'cjs', file: file('cjs') },
      { format: 'es', file: file('es') }
    ],
    plugins: [
      flow(),
      babel({ exclude: 'node_modules/**' }),
      external({ builtins: true, dependencies: true }),
      prettier({ tabWidth: 2, semi: false, singleQuote: true })
    ]
  },
  {
    input,
    output: { format: 'umd', file: file('min'), name: 'Redam', globals: { react: 'React' } },
    plugins: [
      flow(),
      babel({ exclude: 'node_modules/**' }),
      external({ builtins: true, dependencies: true }),
      uglify({}, minify)
    ]
  }
]