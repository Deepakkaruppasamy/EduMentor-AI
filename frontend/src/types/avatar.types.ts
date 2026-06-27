// Avatar System Type Definitions
// Modular — can be removed without affecting any other part of the application

export type AvatarGender = 'male' | 'female';

export type AvatarExpression =
  | 'neutral'
  | 'happy'
  | 'smile'
  | 'laugh'
  | 'thinking'
  | 'confused'
  | 'surprised'
  | 'excited'
  | 'proud'
  | 'sleepy';

export type AvatarPose =
  | 'standing'
  | 'waving'
  | 'hands_in_pocket'
  | 'folded_arms'
  | 'thinking'
  | 'typing'
  | 'reading'
  | 'holding_coffee'
  | 'peace_sign'
  | 'namaste'
  | 'thumbs_up'
  | 'sitting'
  | 'leaning'
  | 'saluting'
  | 'pointing'
  | 'victory'
  | 'professional'
  | 'relaxed'
  | 'walking';

export type AvatarSkinTone = 'light' | 'medium_light' | 'medium' | 'medium_dark' | 'dark';
export type AvatarHairStyle = 'short' | 'medium' | 'long' | 'curly' | 'wavy' | 'bald' | 'ponytail' | 'bun';
export type AvatarHairColor = 'black' | 'brown' | 'blonde' | 'auburn' | 'red' | 'gray' | 'white' | 'blue' | 'pink';
export type AvatarEyeColor = 'brown' | 'dark_brown' | 'blue' | 'green' | 'hazel' | 'gray' | 'black';
export type AvatarOutfit = 'casual' | 'formal' | 'academic' | 'sporty' | 'traditional';
export type AvatarAnimation = 'smooth' | 'bouncy' | 'minimal' | 'expressive';

export interface AvatarConfig {
  gender: AvatarGender;
  skinTone: AvatarSkinTone;
  hairStyle: AvatarHairStyle;
  hairColor: AvatarHairColor;
  eyeColor: AvatarEyeColor;
  eyebrows: 'thin' | 'medium' | 'thick' | 'arched';
  beard?: 'none' | 'stubble' | 'short' | 'full';
  mustache?: 'none' | 'thin' | 'thick';
  makeup?: 'none' | 'light' | 'bold' | 'natural';
  glasses: 'none' | 'round' | 'square' | 'rimless' | 'sunglasses';
  accessories: string[];
  outfit: AvatarOutfit;
  background: string;
  frame: 'circle' | 'rounded' | 'hexagon' | 'none';
  pose: AvatarPose;
  expression: AvatarExpression;
  animationStyle: AvatarAnimation;
}

export const DEFAULT_MALE_CONFIG: AvatarConfig = {
  gender: 'male',
  skinTone: 'medium',
  hairStyle: 'short',
  hairColor: 'black',
  eyeColor: 'brown',
  eyebrows: 'medium',
  beard: 'none',
  mustache: 'none',
  glasses: 'none',
  accessories: [],
  outfit: 'casual',
  background: 'gradient_blue',
  frame: 'circle',
  pose: 'standing',
  expression: 'neutral',
  animationStyle: 'smooth',
};

export const DEFAULT_FEMALE_CONFIG: AvatarConfig = {
  gender: 'female',
  skinTone: 'medium_light',
  hairStyle: 'long',
  hairColor: 'black',
  eyeColor: 'brown',
  eyebrows: 'arched',
  makeup: 'light',
  glasses: 'none',
  accessories: [],
  outfit: 'casual',
  background: 'gradient_purple',
  frame: 'circle',
  pose: 'standing',
  expression: 'neutral',
  animationStyle: 'smooth',
};

// Skin tone color map
export const SKIN_TONES: Record<AvatarSkinTone, { base: string; shadow: string; highlight: string }> = {
  light:        { base: '#FDDBB4', shadow: '#E8B88A', highlight: '#FFF0D9' },
  medium_light: { base: '#F0C08A', shadow: '#D4986A', highlight: '#FFD5A0' },
  medium:       { base: '#C68642', shadow: '#A0622A', highlight: '#DDA060' },
  medium_dark:  { base: '#8D5524', shadow: '#6B3A10', highlight: '#A06830' },
  dark:         { base: '#4A2810', shadow: '#2E1608', highlight: '#5E3418' },
};

export const HAIR_COLORS: Record<AvatarHairColor, string> = {
  black:  '#1a1a1a',
  brown:  '#5C3D2E',
  blonde: '#E8C97A',
  auburn: '#922B21',
  red:    '#C0392B',
  gray:   '#7F8C8D',
  white:  '#ECF0F1',
  blue:   '#2980B9',
  pink:   '#F1948A',
};

export const EYE_COLORS: Record<AvatarEyeColor, string> = {
  brown:      '#8B4513',
  dark_brown: '#3E1F00',
  blue:       '#2980B9',
  green:      '#27AE60',
  hazel:      '#8E7340',
  gray:       '#7F8C8D',
  black:      '#1a1a1a',
};

export const POSE_LABELS: Record<AvatarPose, string> = {
  standing:        'Standing',
  waving:          'Waving',
  hands_in_pocket: 'Hands in Pocket',
  folded_arms:     'Folded Arms',
  thinking:        'Thinking',
  typing:          'Typing on Laptop',
  reading:         'Reading Book',
  holding_coffee:  'Holding Coffee',
  peace_sign:      'Peace Sign',
  namaste:         'Namaste',
  thumbs_up:       'Thumbs Up',
  sitting:         'Sitting',
  leaning:         'Leaning',
  saluting:        'Saluting',
  pointing:        'Pointing',
  victory:         'Victory Pose',
  professional:    'Professional Pose',
  relaxed:         'Relaxed Pose',
  walking:         'Walking Pose',
};

export const EXPRESSION_LABELS: Record<AvatarExpression, string> = {
  neutral:   'Neutral',
  happy:     'Happy',
  smile:     'Smile',
  laugh:     'Laugh',
  thinking:  'Thinking',
  confused:  'Confused',
  surprised: 'Surprised',
  excited:   'Excited',
  proud:     'Proud',
  sleepy:    'Sleepy',
};
