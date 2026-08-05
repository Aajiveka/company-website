import { Box, Img, Txt } from './primitives';
import { ASSET, C, W } from './tokens';

/**
 * The navy masthead every interior page carries: desk illustration, the
 * "MAKE YOUR CAREER WITH" lockup, registration details and the logo badge.
 *
 * The source file nudges these runs by a point or two from page to page; the
 * offsets are props so each page can stay literal.
 */
export function Masthead({
  titleY = 20.6,
  cinY = 21.9,
  tollFreeY = 40.7,
  showTollFree = true,
  illustrationY = 14,
  badgeY = 13.4,
}: {
  titleY?: number;
  cinY?: number;
  tollFreeY?: number;
  showTollFree?: boolean;
  illustrationY?: number;
  badgeY?: number;
}) {
  return (
    <>
      <Box x={0} y={0} w={1190.551} h={76.7} fill={C.navy} />
      <Img src={`${ASSET}/header-illustration.png`} x={24} y={illustrationY} w={94} h={58} eager />
      <Txt x={151} y={titleY} size={31.08} weight={W.semibold} color={C.white}>
        MAKE YOUR CAREER WITH
      </Txt>
      <Txt x={913.6} y={cinY} size={13.1} weight={W.semibold} color={C.white}>
        CIN: U78100HR2023PTC109516
      </Txt>
      {showTollFree && (
        <Txt x={947.5} y={tollFreeY} size={13.1} weight={W.semibold} color={C.white}>
          Toll free no: 18003093346
        </Txt>
      )}
      <Img src={`${ASSET}/logo-badge.png`} alt="Aajiveka" x={1124.3} y={badgeY} w={50.2} h={50.2} eager />
    </>
  );
}

/** The navy footer bar: legal entity on the left, website on the right. */
export function Colophon({ companyY = 805.7, siteY = 805.7, barY = 789.3 }: { companyY?: number; siteY?: number; barY?: number }) {
  return (
    <>
      <Box x={0} y={barY} w={1190.551} h={841.89 - barY} fill={C.navy} />
      <Txt x={26.2} y={companyY} size={16.12} weight={W.semibold} color={C.white}>
        {'Make My Career Technologies pvt. ltd.'}
      </Txt>
      <Txt x={1017.7} y={siteY} size={16.12} weight={W.semibold} color={C.white}>
        www.Aajiveka.com
      </Txt>
    </>
  );
}
