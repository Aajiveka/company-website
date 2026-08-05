import { Img, Sheet, Txt } from '../primitives';
import { ASSET, C, W } from '../tokens';

/** Brochure page 1 — cover. */
export function Cover() {
  return (
    <Sheet label="Aajiveka — cover">
      <Txt x={916.3} y={18} size={14.48} weight={W.semibold} color={C.coverInk}>
        CIN: U78100HR2023PTC109516
      </Txt>
      <Txt x={934.4} y={36.8} size={14.45} weight={W.semibold} color={C.coverInkAlt}>
        GSTIN : 06AAQCM5954Q1ZG
      </Txt>

      <Img
        src={`${ASSET}/logo-full.png`}
        alt="Aajiveka — Job at your door step"
        x={406.2}
        y={128.6}
        w={346.8}
        h={361.2}
        eager
      />

      <Txt x={421.8} y={491.7} size={24.63} weight={W.semibold} color={C.coverInk}>
        Toll free No: 18003093346
      </Txt>
      <Txt x={377.9} y={540.5} size={21.01} weight={W.semibold} color={C.coverCompany}>
        {'Make My Career Technologies Pvt. Ltd.'}
      </Txt>

      <Txt x={904.6} y={620.7} size={15.51} weight={W.semibold} color={C.coverInkAlt}>
        For Whatsapp scan the code
      </Txt>
      <Img src={`${ASSET}/qr-whatsapp.png`} alt="WhatsApp QR code" x={927.2} y={643.9} w={178} h={153} />

      <Img src={`${ASSET}/icon-phone.png`} x={80} y={693.9} w={12.4} h={13.1} />
      <Txt x={112.1} y={690.4} size={16.57} weight={W.semibold} color={C.coverContact}>
        9910763639
      </Txt>

      <Img src={`${ASSET}/icon-mail.png`} x={79.5} y={732.5} w={15.3} h={11.4} />
      <Txt x={111.4} y={727} size={16.57} weight={W.semibold} color={C.coverContact}>
        mk.mishra@aajiveka.com
      </Txt>

      <Img src={`${ASSET}/icon-globe.png`} x={79.6} y={772.6} w={14.2} h={13.1} />
      <Txt x={112.7} y={766.8} size={16.57} weight={W.semibold} color={C.coverContact}>
        www.Aajiveka.com
      </Txt>
    </Sheet>
  );
}
