import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Select } from '@/components/ui';
import type { ScreeningQuestion } from '@/features/clients/components/JobQuestionsEditor';

interface Answer {
  questionId: string;
  answer: string;
}

export function ApplicationQuestionnaire({
  questions,
  onSubmit,
  isLoading,
}: {
  questions: ScreeningQuestion[];
  onSubmit: (answers: Answer[]) => void;
  isLoading?: boolean;
}) {
  const { t } = useTranslation('jobs');
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(questions.map((q) => [q.id, ''])),
  );

  const update = (id: string, value: string) => setAnswers((a) => ({ ...a, [id]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(questions.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? '' })));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-base font-semibold text-navy">{t('questionnaire.title')}</h3>
      {questions.map((q) => (
        <div key={q.id}>
          <label className="mb-1.5 block text-sm font-medium text-navy">
            {q.question}
            {q.required && <span className="ml-1 text-danger">*</span>}
          </label>
          {q.type === 'text' && (
            <textarea
              rows={3}
              required={q.required}
              value={answers[q.id]}
              onChange={(e) => update(q.id, e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          )}
          {q.type === 'single_choice' && (
            <Select
              options={(q.options ?? []).map((o) => ({ label: o, value: o }))}
              value={answers[q.id]}
              onChange={(e) => update(q.id, e.target.value)}
              placeholder={t('questionnaire.selectAnswer')}
            />
          )}
          {q.type === 'yes_no' && (
            <div className="flex gap-4">
              {['Yes', 'No'].map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={q.id}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => update(q.id, opt)}
                    required={q.required}
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary/30"
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
      <Button type="submit" isLoading={isLoading}>
        {t('questionnaire.submitApplication')}
      </Button>
    </form>
  );
}
