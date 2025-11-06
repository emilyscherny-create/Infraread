import React from "react";

export default function Toolbar({ format, setFormat }) {
  const handleChange = (field, value) => {
    setFormat({ ...format, [field]: value });
  };

  return (
    <div className="toolbar">
      <label>
        Font&nbsp;
        <select
          value={format.fontFamily}
          onChange={(e) => handleChange("fontFamily", e.target.value)}
        >
          <option value="serif">Serif</option>
          <option value="sans-serif">Sans-serif</option>
          <option value="monospace">Monospace</option>
        </select>
      </label>

      <label>
        Size&nbsp;
        <input
          type="number"
          min="8"
          max="48"
          value={format.fontSize}
          onChange={(e) => handleChange("fontSize", parseInt(e.target.value))}
        />
      </label>

      <label>
        Spacing&nbsp;
        <input
          type="number"
          step="0.1"
          value={format.lineHeight}
          onChange={(e) =>
            handleChange("lineHeight", parseFloat(e.target.value))
          }
        />
      </label>
    </div>
  );
}
