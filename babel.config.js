module.exports = {
  env: {
    TEST: {
      presets: [
        ['@babel/preset-env', {
          targets: { node: '8' }
        }],
        '@babel/preset-react',
        '@babel/preset-flow',
        'power-assert',
      ],
      plugins: [
        'istanbul'
      ]
    },
    BUILD: {
      presets: [
        ['@babel/preset-env', {
          modules: false,
          targets: { browsers: ['last 2 versions', 'safari >= 7'] }
        }],
        '@babel/preset-flow',
        '@babel/preset-react'
      ]
    }
  }
}
