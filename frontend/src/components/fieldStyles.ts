// Input styles from the new-asset form.
const idle = 'border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20'
const invalid = 'border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200'

export const inputClass = (error?: string) =>
  `w-full h-9 px-3 text-body-default font-body-default bg-surface-container-lowest rounded border text-on-surface transition-all placeholder:text-outline ${error ? invalid : idle}`

export const selectClass = (error?: string) => `${inputClass(error)} pl-3 pr-8 appearance-none cursor-pointer`

export const textareaClass = (error?: string) =>
  `w-full p-3 text-body-default font-body-default bg-surface-container-lowest rounded border text-on-surface transition-all placeholder:text-outline resize-y ${error ? invalid : idle}`
