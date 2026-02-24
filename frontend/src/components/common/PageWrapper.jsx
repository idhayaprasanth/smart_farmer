import { motion } from "framer-motion";

export default function PageWrapper({ title, subtitle, children, action }) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="font-display text-2xl md:text-3xl tracking-wide">{title}</h1>
          <p className="text-sm text-slate-300">{subtitle}</p>
        </div>
        {action ? <div>{action}</div> : null}
      </motion.div>
      {children}
    </div>
  );
}
