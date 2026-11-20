import PetSprite from '../pet/PetSprite'
import { LOGIN_CAT, resolveOutfit } from '../pet/petData'
import { useThemeStore } from '../store/useThemeStore'

// The login page's own mascot: "มณีสยาม", an exclusive cat that is never rolled for any
// user and never changes (whoever is typing). It peeks over the sign-in card:
//  - two layers: the head sits BEHIND the card, the paws grip OVER its top edge;
//  - eyes follow the caret (gaze), paws cover the eyes while a hidden password is typed;
//  - it wears the active festival's outfit, inside a soft golden aura.
// Purely decorative: aria-hidden, pointer-events none.

export default function LoginMascot({ festival = 'none', gaze = { x: 0, y: 0 }, covering = false, waving = false, hello = false }) {
  const skin = useThemeStore((s) => s.skin)
  const outfit = { ...resolveOutfit(festival, {}, skin), aura: 'goldaura' }
  const vars = { '--gx': gaze.x, '--gy': gaze.y }

  return (
    <>
      <div className="login-pet back" aria-hidden="true">
        <PetSprite species="cat" coat={LOGIN_CAT} outfit={outfit} pose="peek" layer="back" style={vars} />
      </div>
      {hello && !covering && (
        <div className="login-hello" aria-hidden="true">
          สวัสดีครับ 👋
        </div>
      )}
      <div className={`login-pet front ${covering ? 'covering' : waving ? 'waving' : ''}`} aria-hidden="true">
        <PetSprite species="cat" coat={LOGIN_CAT} outfit={outfit} pose="peek" layer="front" style={vars} />
      </div>
    </>
  )
}
