import { motion } from "motion/react";

const shapes = [
  {
    className: "top-20 left-10 w-16 h-16 bg-pink-300 rounded-full",
    duration: 6,
    delay: 0,
  },
  {
    className: "top-40 right-20 w-12 h-12 bg-fuchsia-300 rounded-lg rotate-45",
    duration: 7,
    delay: 1,
  },
  {
    className: "bottom-32 left-1/4 w-20 h-20 bg-purple-300 rounded-full",
    duration: 8,
    delay: 0.5,
  },
  {
    className: "top-1/3 right-1/3 w-14 h-14 bg-violet-300 rounded-lg",
    duration: 5,
    delay: 1.5,
  },
  {
    className: "bottom-20 right-10 w-10 h-10 bg-pink-200 rounded-full",
    duration: 6.5,
    delay: 2,
  },
  {
    className: "top-60 left-1/3 w-8 h-8 bg-fuchsia-200 rounded-full",
    duration: 7.5,
    delay: 0.8,
  },
  {
    className: "bottom-40 right-1/4 w-6 h-6 bg-purple-200 rounded-lg rotate-12",
    duration: 5.5,
    delay: 1.2,
  },
];

export default function FloatingShapes() {
  return (
    <>
      {shapes.map((shape, index) => (
        <motion.div
          key={index}
          className={`floating-shape ${shape.className}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: 0.3,
            y: [0, -20, 0],
            rotate: [0, 10, 0],
          }}
          transition={{
            opacity: { duration: 0.5, delay: shape.delay },
            y: {
              duration: shape.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: shape.delay,
            },
            rotate: {
              duration: shape.duration * 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: shape.delay,
            },
          }}
        />
      ))}
    </>
  );
}
