import { Colophon, Masthead } from '../Chrome';
import { Box, Sheet, Txt } from '../primitives';
import { C, W } from '../tokens';

/** Brochure page 8 — premium subscription. */
export function Premium() {
  return (
    <Sheet label="Premium subscription">
      <Masthead titleY={20.3} cinY={21.5} tollFreeY={40.4} illustrationY={13.6} badgeY={13.1} />

      <Box x={31.3} y={165.8} w={1118.2} h={59.5} fill={C.yellow} />
      <Txt x={55.2} y={182.5} size={26.3} weight={W.extrabold} color={C.navy}>
        {'"Upgrade your job search game with Aajiveka\'s premium subscription features"'}
      </Txt>

      <Txt x={230.5} y={320.9} size={28.93} weight={W.extrabold} color={C.navy}>
        {"Get the job you deserve with Aajiveka's exclusive"}
      </Txt>
      <Txt x={383.7} y={355.8} size={28.93} weight={W.extrabold} color={C.navy}>
        premium subscription plans
      </Txt>

      <Txt x={127.3} y={405.4} size={16.08}>
        {"Unlock unlimited job opportunities and exclusive career growth resources with Aajiveka's flexible subscription plans."}
      </Txt>

      <Txt x={379.2} y={507.1} size={32.85} weight={W.extrabold} color={C.navy}>
        Annual Subscription plan
      </Txt>
      <Txt x={374.6} y={543.2} size={120.48} weight={W.extrabold} color={C.navy}>
        Rs. 999
      </Txt>
      <Txt x={474.8} y={686.3} size={28.62}>
        (excluding taxes)
      </Txt>

      <Colophon companyY={805.9} siteY={805.9} barY={789.5} />
    </Sheet>
  );
}
