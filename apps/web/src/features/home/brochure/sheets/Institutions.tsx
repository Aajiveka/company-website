import { Colophon, Masthead } from '../Chrome';
import { Box, Img, Sheet, Txt } from '../primitives';
import { ASSET, C, W } from '../tokens';

const BULLETS = [
  { y: 344.8, text: '• Free Career Counseling' },
  { y: 398.1, text: '• We will profile Internship for all students' },
  { y: 451.5, text: '• Free resume creation' },
  { y: 504.9, text: '• Placement of students' },
] as const;

/** Brochure page 10 — additional services for educational institutions. */
export function Institutions() {
  return (
    <Sheet label="Additional services for educational institutions">
      <Masthead titleY={21.4} cinY={22.6} tollFreeY={41.5} illustrationY={14.7} badgeY={14.2} />

      <Txt x={31.6} y={200.9} size={41.37} weight={W.extrabold} color={C.navy}>
        Additional Services for
      </Txt>
      <Txt x={31.6} y={251.2} size={41.37} weight={W.extrabold} color={C.navy}>
        Educational Institution:
      </Txt>

      {BULLETS.map((b) => (
        <Txt key={b.text} x={31.3} y={b.y} size={24.4} weight={W.semibold}>
          {b.text}
        </Txt>
      ))}
      <Txt x={31.3} y={536.4} size={16.12}>
        {'   (will arrange max 6 interviews in a year)'}
      </Txt>

      <Box x={669.6} y={223.4} w={477.5} h={444.6} radius={38.6} fill={C.navy} />
      <Txt x={716.3} y={269.6} size={39.42} weight={W.extrabold} color={C.white}>
        {'Further\u00a0Assistance'}
      </Txt>
      <Box x={843.4} y={329.9} w={129.9} h={2.8} fill={C.white} />
      <Txt x={713.8} y={353.8} size={20.21} weight={W.light} color={C.white}>
        For more information kindly write us at
      </Txt>

      <Img src={`${ASSET}/icon-mail-circle.png`} x={885.3} y={418.8} w={46.2} h={46.2} />
      <Txt x={758.5} y={479.7} size={23.19} weight={W.semibold} color={C.white}>
        mk.mishra@aajiveka.com
      </Txt>

      <Img src={`${ASSET}/icon-phone-circle.png`} x={885.3} y={533.5} w={46.2} h={46.2} />
      <Txt x={839.6} y={594.3} size={23.19} weight={W.semibold} color={C.white}>
        9910763639
      </Txt>

      <Colophon companyY={805.7} siteY={800.6} />
    </Sheet>
  );
}
