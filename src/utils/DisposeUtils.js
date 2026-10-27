// Dispose unique GPU resources once, including material-owned canvas textures.
export function disposeTree(root) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    root.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        for (const material of [object.material].flat().filter(Boolean)) {
            materials.add(material);
            for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        }
    });
    textures.forEach(value => value.dispose());
    materials.forEach(value => value.dispose());
    geometries.forEach(value => value.dispose());
}
