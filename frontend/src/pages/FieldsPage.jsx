import { motion } from "framer-motion";
import { CheckCircle2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorState, LoadingState } from "../components/common/LoadingState";
import PageWrapper from "../components/common/PageWrapper";
import CreateFieldModal from "../components/fields/CreateFieldModal";
import { fieldApi } from "../services/api";

export default function FieldsPage() {
  const [fields, setFields] = useState([]);
  const [activeField, setActiveField] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  async function loadFields() {
    setLoading(true);
    setError("");
    try {
      const [allFields, active] = await Promise.all([fieldApi.getFields(), fieldApi.getActiveField()]);
      setFields(Array.isArray(allFields) ? allFields : []);
      setActiveField(active?.active_field || "");
    } catch (err) {
      setError(err.message || "Failed to load fields");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFields();
  }, []);

  async function createField(payload) {
    setCreating(true);
    try {
      await fieldApi.createField(payload);
      setModalOpen(false);
      await loadFields();
    } catch (err) {
      setError(err.message || "Failed to create field");
    } finally {
      setCreating(false);
    }
  }

  async function makeActive(fieldId) {
    setError("");
    try {
      await fieldApi.setActiveField(fieldId);
      setActiveField(fieldId);
    } catch (err) {
      setError(err.message || "Failed to set active field");
    }
  }

  return (
    <PageWrapper
      title="Field Management"
      subtitle="Create fields, inspect them, and switch active control zones"
      action={
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-neon-green px-3 py-2 text-sm font-semibold text-night-950 transition hover:shadow-neonGreen"
        >
          <Plus className="h-4 w-4" />
          Add Field
        </button>
      }
    >
      {loading ? <LoadingState label="Loading fields..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fields.length === 0 ? (
            <div className="glass-card col-span-full p-6 text-center text-slate-300">
              No fields found. Create your first field.
            </div>
          ) : null}

          {fields.map((field, index) => {
            const isActive = activeField === field.field_id;
            return (
              <motion.div
                key={field.field_id || `${field.field_name}-${index}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`glass-card p-4 ${isActive ? "neon-border-green" : ""}`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl">{field.field_name || field.field_id}</h3>
                    <p className="text-xs text-slate-400">{field.field_id || "N/A"}</p>
                  </div>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-neon-green/35 bg-neon-green/10 px-2 py-1 text-xs text-neon-green">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Active
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1 text-sm text-slate-200">
                  <p>
                    <span className="text-slate-400">Location:</span> {field.location || "N/A"}
                  </p>
                  <p>
                    <span className="text-slate-400">Soil Type:</span> {field.soil_type || "N/A"}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isActive}
                  onClick={() => makeActive(field.field_id)}
                  className="mt-4 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isActive ? "Currently Active" : "Set Active Field"}
                </button>
              </motion.div>
            );
          })}
        </div>
      ) : null}

      <CreateFieldModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={createField}
        creating={creating}
      />
    </PageWrapper>
  );
}
