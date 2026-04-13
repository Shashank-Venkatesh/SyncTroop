import { cn } from '../../utils/classNames.js'

export function Card({ children, className, as: Component = 'section', ...props }) {
  const Wrapper = Component

  return (
    <Wrapper
      className={cn(
        'relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-panel/95 p-5 shadow-glow backdrop-blur-xl',
        className,
      )}
      {...props}
    >
      {children}
    </Wrapper>
  )
}