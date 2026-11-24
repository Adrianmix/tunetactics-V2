import producerAvatarImg from '../assets/images/studio_producer_avatar_1795511991652.jpg';
import singerReelsImg from '../assets/images/singer_reels_frame_1795511992230.jpg';
import trackCoverImg from '../assets/images/track_cover_art_1795511993099.jpg';
import stepBuildImg from '../assets/images/step_build_profile_1795516830119.jpg';
import stepDiscoverImg from '../assets/images/step_discover_talent_1795516830050.jpg';
import stepCollaborateImg from '../assets/images/step_make_music_1795516830706.jpg';
import foundingPassImg from '../assets/images/founding_studio_pass_1795516830988.jpg';

type ImageAsset = string | { src: string };

export function resolveAssetUrl(asset: ImageAsset): string {
  return typeof asset === 'string' ? asset : asset.src;
}

export const STUDIO_ASSETS = {
  producerAvatar: resolveAssetUrl(producerAvatarImg),
  singerReelsFrame: resolveAssetUrl(singerReelsImg),
  trackCoverArt: resolveAssetUrl(trackCoverImg),
  stepBuildProfile: resolveAssetUrl(stepBuildImg),
  stepDiscoverTalent: resolveAssetUrl(stepDiscoverImg),
  stepMakeMusic: resolveAssetUrl(stepCollaborateImg),
  foundingStudioPass: resolveAssetUrl(foundingPassImg),
} as const;
