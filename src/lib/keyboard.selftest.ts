import assert from 'node:assert/strict'
import { isComposingKeyEvent } from './keyboard'

assert.equal(isComposingKeyEvent({ isComposing: true, keyCode: 13 }), true)
assert.equal(isComposingKeyEvent({ isComposing: true, keyCode: 229 }), true)
assert.equal(isComposingKeyEvent({ isComposing: false, keyCode: 229 }), true)
assert.equal(isComposingKeyEvent({ isComposing: false, keyCode: 13 }), false)
assert.equal(isComposingKeyEvent({ isComposing: false, keyCode: 0 }), false)

console.log('Keyboard composition self-test OK')
