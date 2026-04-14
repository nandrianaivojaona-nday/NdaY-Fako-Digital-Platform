"use client";

type Props = {
  saveDraft: () => void;
  saveCompleted: () => void;
};

export default function StepConfirm({
  saveDraft,
  saveCompleted,
}: Props) {

  return (
    <div>

      <h2>Confirm</h2>

      <button onClick={saveDraft}>
        Save Draft
      </button>

      <button onClick={saveCompleted}>
        Save Completed
      </button>

    </div>
  );
}