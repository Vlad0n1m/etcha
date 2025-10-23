"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode } from 'react'

interface PageTransitionProps {
    children: ReactNode
    className?: string
}

// Анимации для переходов между страницами
const pageVariants = {
    initial: {
        opacity: 0,
        y: 20,
        scale: 0.98
    },
    in: {
        opacity: 1,
        y: 0,
        scale: 1
    },
    out: {
        opacity: 0,
        y: -20,
        scale: 1.02
    }
}

const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.4
}

// Анимации для элементов списка
const listVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

const itemVariants = {
    hidden: {
        opacity: 0,
        y: 20,
        scale: 0.95
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 12
        }
    }
}

// Анимации для карточек событий
const cardVariants = {
    hidden: {
        opacity: 0,
        y: 30,
        scale: 0.9
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 120,
            damping: 15
        }
    }
}

// Анимации для навигации
const navVariants = {
    hidden: {
        opacity: 0,
        y: 50
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 12
        }
    }
}

// Анимации для модальных окон и drawer'ов
const modalVariants = {
    hidden: {
        opacity: 0,
        scale: 0.8,
        y: 50
    },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 25
        }
    }
}

// Анимации для загрузки
const loadingVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            duration: 0.3
        }
    }
}

// Основной компонент для анимации страниц
export function PageTransition({ children, className = "" }: PageTransitionProps) {
    return (
        <motion.div
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className={className}
        >
            {children}
        </motion.div>
    )
}

// Компонент для анимации списков
export function AnimatedList({ children, className = "" }: PageTransitionProps) {
    return (
        <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className={className}
        >
            {children}
        </motion.div>
    )
}

// Компонент для анимации элементов списка
export function AnimatedItem({ children, className = "" }: PageTransitionProps) {
    return (
        <motion.div
            variants={itemVariants}
            className={className}
        >
            {children}
        </motion.div>
    )
}

// Компонент для анимации карточек
export function AnimatedCard({ children, className = "" }: PageTransitionProps) {
    return (
        <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className={className}
        >
            {children}
        </motion.div>
    )
}

// Компонент для анимации навигации
export function AnimatedNav({ children, className = "" }: PageTransitionProps) {
    return (
        <motion.div
            variants={navVariants}
            initial="hidden"
            animate="visible"
            className={className}
        >
            {children}
        </motion.div>
    )
}

// Компонент для анимации модальных окон
export function AnimatedModal({ children, className = "" }: PageTransitionProps) {
    return (
        <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className={className}
        >
            {children}
        </motion.div>
    )
}

// Компонент для анимации загрузки
export function AnimatedLoading({ children, className = "" }: PageTransitionProps) {
    return (
        <motion.div
            variants={loadingVariants}
            initial="hidden"
            animate="visible"
            className={className}
        >
            {children}
        </motion.div>
    )
}

// Компонент для анимации с задержкой
export function DelayedAnimation({
    children,
    delay = 0,
    className = ""
}: PageTransitionProps & { delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                delay,
                type: "spring",
                stiffness: 100,
                damping: 12
            }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

// Компонент для анимации появления снизу
export function SlideUpAnimation({ children, className = "" }: PageTransitionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                type: "spring",
                stiffness: 100,
                damping: 15
            }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

// Компонент для анимации появления слева
export function SlideLeftAnimation({ children, className = "" }: PageTransitionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
                type: "spring",
                stiffness: 100,
                damping: 15
            }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

// Компонент для анимации появления справа
export function SlideRightAnimation({ children, className = "" }: PageTransitionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
                type: "spring",
                stiffness: 100,
                damping: 15
            }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

// Компонент для анимации масштабирования
export function ScaleAnimation({ children, className = "" }: PageTransitionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
                type: "spring",
                stiffness: 200,
                damping: 20
            }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

// Компонент для анимации с AnimatePresence
export function AnimatedPresenceWrapper({ children }: { children: ReactNode }) {
    return (
        <AnimatePresence mode="wait">
            {children}
        </AnimatePresence>
    )
}

export default PageTransition
