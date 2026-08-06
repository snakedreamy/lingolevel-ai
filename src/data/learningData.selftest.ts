import assert from 'node:assert/strict'
import { DIFFICULTY_LEVELS, isDifficultyLevel } from '../types'
import { LEVELS } from './levels'
import { validateLearningCurriculum } from './learningCurriculum'
import { validateLearningLessons } from './learningLessons'

validateLearningCurriculum()
validateLearningLessons()
assert.deepEqual(LEVELS.map((level) => level.id), [...DIFFICULTY_LEVELS])
assert.ok(DIFFICULTY_LEVELS.every(isDifficultyLevel))
assert.equal(isDifficultyLevel('unknown'), false)

console.log('Learning data self-test OK')
