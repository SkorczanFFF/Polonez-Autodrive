import * as THREE from "three";
import { LAYERS } from "../src/config.js";
import { createMaterials } from "../src/scene/materials.js";

/** The app's materials, with a stand-in for the road-line texture. */
export const testMaterials = () =>
  createMaterials({ [String(LAYERS.road.wireMap)]: new THREE.Texture() }, 1);
