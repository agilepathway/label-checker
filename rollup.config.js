import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'es',
    sourcemap: false
  },
  plugins: [typescript({ noEmit: false, declaration: false })]
};
