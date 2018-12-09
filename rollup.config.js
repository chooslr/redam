import Flow from 'rollup-plugin-flow'
import Babel from 'rollup-plugin-babel'
import AutoExternal from 'rollup-plugin-auto-external'
import Prettier from 'rollup-plugin-prettier'
import { uglify as Uglify } from 'rollup-plugin-uglify'
import { minify } from 'uglify-es'

const input = `./index.js`
const file = mid => `dist/${mid}.js`

const flow = Flow()
const babel = Babel({ exclude: 'node_modules/**' })
const autoexternal = AutoExternal({ builtins: true, dependencies: true })

export default [
  {
    input,
    output: [
      { format: 'cjs', file: file('cjs') },
      { format: 'es', file: file('es') }
    ],
    plugins: [
      flow,
      babel,
      autoexternal,
      Prettier({
        parser: 'babylon',
        tabWidth: 2,
        semi: false,
        singleQuote: true
      })
    ]
  },
  {
    input,
    output: {
      format: 'umd',
      file: file('min'),
      name: 'Redam',
      globals: { react: 'React' }
    },
    plugins: [
      flow,
      babel,
      autoexternal,
      Uglify({}, minify)
    ]
  }
]
