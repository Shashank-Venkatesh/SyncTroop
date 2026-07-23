export const MIN_ROOM_MEMBERS = 2
export const MAX_ROOM_MEMBERS = 100

export function parseMaxMembers(value) {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < MIN_ROOM_MEMBERS || parsed > MAX_ROOM_MEMBERS) {
    return null
  }

  return parsed
}

export function validateMaxMembersInput(value) {
  if (value === '' || value === null || value === undefined) {
    return 'Choose how many people can join this room.'
  }

  const parsed = parseMaxMembers(value)

  if (!parsed) {
    return `Enter a whole number between ${MIN_ROOM_MEMBERS} and ${MAX_ROOM_MEMBERS}.`
  }

  return ''
}
