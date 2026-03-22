"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-gray-50 pt-16">
      <motion.div
        className="text-center px-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Chào mừng đến với Landing Page
        </h1>
        <p className="text-xl text-gray-500 mb-8">
          Được xây dựng với Next.js · TypeScript · Tailwind · Framer Motion
        </p>
        <a
          href="#contact"
          className="bg-black text-white px-8 py-3 rounded-xl text-lg hover:bg-gray-800 transition"
        >
          Bắt đầu ngay
        </a>
      </motion.div>
    </section>
  );
}
