import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Select } from '@/components/ui';

export interface ScreeningQuestion {
  id: string;
  type: 'text' | 'single_choice' | 'yes_no';
  question: string;
  options?: string[];
  required: boolean;
}

function generateId() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function JobQuestionsEditor({
  questions,
  onChange,
}: {
  questions: ScreeningQuestion[];
  onChange: (q: ScreeningQuestion[]) => void;
}) {
  const { t } = useTranslation('dashboard');

  const addQuestion = () => {
    onChange([...questions, { id: generateId(), type: 'text', question: '', required: false }]);
  };

  const updateQuestion = (id: string, patch: Partial<ScreeningQuestion>) => {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter((q) => q.id !== id));
  };

  const addOption = (id: string) => {
    const q = questions.find((q) => q.id === id);
    if (q) updateQuestion(id, { options: [...(q.options ?? []), ''] });
  };

  const updateOption = (qId: string, optIdx: number, value: string) => {
    const q = questions.find((q) => q.id === qId);
    if (q) {
      const opts = [...(q.options ?? [])];
      opts[optIdx] = value;
      updateQuestion(qId, { options: opts });
    }
  };

  const removeOption = (qId: string, optIdx: number) => {
    const q = questions.find((q) => q.id === qId);
    if (q) {
      const opts = [...(q.options ?? [])];
      opts.splice(optIdx, 1);
      updateQuestion(qId, { options: opts });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-navy">{t('questionnaire.heading')}</h3>
        <Button type="button" size="sm" variant="outline" onClick={addQuestion}>
          <Plus className="mr-1 h-3.5 w-3.5" /> {t('questionnaire.addQuestion')}
        </Button>
      </div>

      {questions.map((q) => (
        <div key={q.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-600">
          <div className="mb-2 flex items-start gap-2">
            <GripVertical className="mt-2 h-4 w-4 shrink-0 text-gray-300" />
            <div className="flex-1 space-y-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <Input
                  placeholder={t('questionnaire.questionPlaceholder')}
                  value={q.question}
                  onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                />
                <Select
                  options={[
                    { label: t('questionnaire.typeText'), value: 'text' },
                    { label: t('questionnaire.typeChoice'), value: 'single_choice' },
                    { label: t('questionnaire.typeYesNo'), value: 'yes_no' },
                  ]}
                  value={q.type}
                  onChange={(e) => updateQuestion(q.id, { type: e.target.value as ScreeningQuestion['type'], options: e.target.value === 'single_choice' ? ['', ''] : undefined })}
                />
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-primary"
                  />
                  {t('questionnaire.required')}
                </label>
              </div>

              {q.type === 'single_choice' && (
                <div className="space-y-1.5 pl-2">
                  {(q.options ?? []).map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{oi + 1}.</span>
                      <Input
                        placeholder={t('questionnaire.optionPlaceholder', { n: oi + 1 })}
                        value={opt}
                        onChange={(e) => updateOption(q.id, oi, e.target.value)}
                        className="flex-1"
                      />
                      {(q.options?.length ?? 0) > 2 && (
                        <button type="button" onClick={() => removeOption(q.id, oi)} className="text-gray-400 hover:text-danger">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => addOption(q.id)} className="text-xs font-medium text-primary hover:underline">
                    + {t('questionnaire.addOption')}
                  </button>
                </div>
              )}
            </div>
            <button type="button" onClick={() => removeQuestion(q.id)} className="mt-1 text-gray-400 hover:text-danger">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {questions.length === 0 && (
        <p className="text-center text-sm text-gray-400">{t('questionnaire.noQuestions')}</p>
      )}
    </div>
  );
}
