import { AuthPanel } from "@/components/auth-panel";
import { SavedRecipesManager } from "@/components/saved-recipes-manager";
import { MyAiRecipes } from "@/components/my-ai-recipes";
import { MyKitchen } from "@/components/my-kitchen";

export default function AccountPage() {
  return <div className="account-page"><div className="account-top"><div className="account-aside"><p className="eyebrow">FRIDGE RESCUE</p><h1>Tavo mėgstami receptai — visada po ranka.</h1><p>Susikurk savo skonių kolekciją ir paversk tai, ką turi šaldytuve, nauju mėgstamu patiekalu.</p><span className="account-aside-art">🥑</span></div><AuthPanel /></div><MyKitchen /><SavedRecipesManager /><MyAiRecipes /></div>;
}
