import { useState } from 'react';
import { FileText } from 'lucide-react';
import { getErrorMessage } from '@/lib/axios';
import { useGenerateOffer } from '../q3.api';
import { fmtDay, isoDate } from '../q3.format';
import type { DocumentsDetail } from '../q3.types';
import { Q3Modal } from './Q3Modal';
import { Q3Button, fieldClass } from './primitives';
import { useQ3Toast } from './q3-toast-context';

/**
 * "Generate offer letter". The Figma has no frame for this step, so it is a plain Q3 form in
 * the Record decision modal's language: the four facts the offer mail carries.
 */
export function GenerateOfferModal({ open, onClose, detail }: { open: boolean; onClose: () => void; detail: DocumentsDetail }) {
  const toast = useQ3Toast();
  const generate = useGenerateOffer(detail.mapId);
  const today = isoDate(new Date());
  const [designation, setDesignation] = useState(detail.jobTitle);
  const [ctc, setCtc] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [location, setLocation] = useState(detail.candidate.location);
  const [touched, setTouched] = useState(false);

  const missing = {
    designation: !designation.trim(),
    ctc: !ctc.trim(),
    joiningDate: !joiningDate || joiningDate < today,
  };
  const invalid = missing.designation || missing.ctc || missing.joiningDate;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (invalid) return;
    generate.mutate(
      { designation: designation.trim(), ctc: ctc.trim(), joiningDate, location: location.trim() || undefined },
      {
        onSuccess: () => {
          // Parse the date as local midnight, so "30 Oct" does not slip a day west of UTC.
          toast.success('Offer letter sent', `To ${detail.candidate.name} · joining ${fmtDay(new Date(`${joiningDate}T00:00:00`))}`);
          onClose();
        },
        onError: (err) => toast.error("Couldn't generate the offer", getErrorMessage(err)),
      },
    );
  };

  const label = 'text-[12.5px] font-semibold leading-[15px] text-q3-ink-soft';
  const error = 'text-xs text-q3-red';

  return (
    <Q3Modal
      open={open}
      onClose={onClose}
      title="Generate offer letter"
      subtitle={`${detail.candidate.name} · ${detail.company}`}
      footer={
        <>
          <Q3Button onClick={onClose} className="min-h-[38px]">
            Cancel
          </Q3Button>
          <Q3Button type="submit" form="q3-offer-form" variant="primary" icon={FileText} loading={generate.isPending}>
            Generate & send offer
          </Q3Button>
        </>
      }
    >
      <form id="q3-offer-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label htmlFor="q3-offer-designation" className={label}>
            Designation
          </label>
          <input
            id="q3-offer-designation"
            className={fieldClass}
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            aria-invalid={touched && missing.designation}
          />
          {touched && missing.designation && <p className={error}>Enter the designation on the offer.</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="q3-offer-ctc" className={label}>
            Annual CTC
          </label>
          <input
            id="q3-offer-ctc"
            className={fieldClass}
            value={ctc}
            onChange={(e) => setCtc(e.target.value)}
            placeholder="₹6,00,000"
            aria-invalid={touched && missing.ctc}
          />
          {touched && missing.ctc && <p className={error}>Enter the annual CTC.</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="q3-offer-joining" className={label}>
            Joining date
          </label>
          <input
            id="q3-offer-joining"
            type="date"
            min={today}
            className={fieldClass}
            value={joiningDate}
            onChange={(e) => setJoiningDate(e.target.value)}
            aria-invalid={touched && missing.joiningDate}
          />
          {touched && missing.joiningDate && <p className={error}>Pick a joining date from today onwards.</p>}
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label htmlFor="q3-offer-location" className={label}>
            Location <span className="font-normal text-q3-muted">(optional)</span>
          </label>
          <input id="q3-offer-location" className={fieldClass} value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
      </form>
    </Q3Modal>
  );
}
