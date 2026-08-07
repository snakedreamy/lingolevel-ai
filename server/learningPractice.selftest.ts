import assert from 'node:assert/strict'
import { learningLessonForConcept, staticLearningActivities } from './learningPractice'

const lesson = learningLessonForConcept('pre-sentence-chunks')
assert.ok(lesson)

const activities = staticLearningActivities(lesson)
assert.equal(activities.length, 4)
assert.deepEqual(activities.map((activity) => activity.dimension), [
  'recognition',
  'understanding',
  'construction',
  'application',
])
assert.notEqual(activities[0], lesson.activities[0])
assert.equal(activities[0].prompt, lesson.activities[0].prompt)
if (activities[0].type === 'choice' && lesson.activities[0].type === 'choice') {
  assert.notEqual(activities[0].options, lesson.activities[0].options)
}

console.log('Learning practice self-test OK')
