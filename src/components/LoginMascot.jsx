import PetSprite from '../pet/PetSprite'
import { pickCoat, resolveOutfit } from '../pet/petData'
import { readLocalPet } from '../store/usePetStore'

// The login mascot is the user's own pet peeking over the sign-in card:
//  - two layers: the head sits BEHIND the card, the paws grip OVER its top edge;
//  - its coat is rolled from the username as you type (so it lands on *your* pet —
//    the same one that walks around the app after you sign in);
//  - species + equipped items come from this device's copy of that user's pet, the
//    festival adds its outfit;
//  - eyes follow the caret (gaze), paws cover the eyes while a hidden password is typed.
// Purely decorative: aria-hidden, pointer-events none.

export default function LoginMascot({ festival = 'none', username = '', gaze = { x: 0, y: 0 }, covering = false }) {
  const saved = readLocalPet(username)
  const species = saved?.species === 'dog' ? 'dog' : 'cat'
  const coat = pickCoat(species, username)
  const outfit = resolveOutfit(festival, saved?.equipped)
  const vars = { '--gx': gaze.x, '--gy': gaze.y }

  return (
    <>
      <div className="login-pet back" aria-hidden="true">
        <PetSprite species={species} coat={coat} outfit={outfit} pose="peek" layer="back" style={vars} />
      </div>
      <div className={`login-pet front ${covering ? 'covering' : ''}`} aria-hidden="true">
        <PetSprite species={species} coat={coat} outfit={outfit} pose="peek" layer="front" style={vars} />
      </div>
    </>
  )
}
