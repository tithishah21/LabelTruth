export type HeroCollageImage = {
  src: string;
  alt: string;
  objectPosition: string;
};

export const HERO_COLLAGE: HeroCollageImage[] = [
  {
    src: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=700&q=80",
    alt: "Gourmet burgers on a serving board",
    objectPosition: "center center"
  },
  {
    src: "https://images.unsplash.com/photo-1621841987490-f17750075ced?auto=format&fit=crop&w=700&q=80",
    alt: "Nutrition facts label on a packaged snack",
    objectPosition: "center 30%"
  },
  {
    src: "https://images.unsplash.com/photo-1761486691774-5493fdaa3ed1?auto=format&fit=crop&w=700&q=80",
    alt: "Person reading the ingredient label on a food pouch",
    objectPosition: "center center"
  },
  {
    src: "https://images.unsplash.com/photo-1775813736752-303d352d0002?auto=format&fit=crop&w=700&q=80",
    alt: "Oats bag with Nutri-Score and organic label",
    objectPosition: "center center"
  }
];

export const HERO_COLLAGE_ALT = "Collage of food and ingredient label photos";
