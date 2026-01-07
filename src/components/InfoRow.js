export default function InfoRow({
  label,
  value,
  isEditing = false,
  fieldKey,
  editFormData,
  handleFieldChange,
  type = "text",
}) {
  const formatValue = (val) => {
    if (val === null || val === undefined || val === "") return "Non renseigné"
    if (typeof val === "string" || typeof val === "number") return String(val)
    if (typeof val === "boolean") return val ? "Oui" : "Non"
    if (Array.isArray(val)) return val.length ? val.join(", ") : "Non renseigné"
    if (typeof val === "object") {
      if (val.name) return val.name
      if (val.libelle) return val.libelle
      if (val.label) return val.label
      const values = Object.values(val)
      if (values.length === 1) return String(values[0])
      try {
        return JSON.stringify(val)
      } catch {
        return "Non renseigné"
      }
    }
    return "Non renseigné"
  }

  const isEmpty =
    value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)

  const displayValue = isEditing && fieldKey && editFormData ? editFormData[fieldKey] : value

  const handleChange = (e) => {
    const v = type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value
    if (handleFieldChange && fieldKey) handleFieldChange(fieldKey, v)
  }

  return (
    <div className="info-field">
      <div className="info-label">{label}</div>

      <div className="info-value" style={{ whiteSpace: "pre-wrap" }}>
        {isEditing && fieldKey ? (
          type === "textarea" ? (
            <textarea value={displayValue ?? ""} onChange={handleChange} />
          ) : (
            <input
              type={type}
              value={displayValue ?? ""}
              onChange={handleChange}
              placeholder={isEmpty ? "Non renseigné" : undefined}
            />
          )
        ) : (
          formatValue(value)
        )}
      </div>
    </div>
  )
}
