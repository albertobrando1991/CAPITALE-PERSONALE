import { UploadMaterial } from "../UploadMaterial";

export default function UploadMaterialExample() {
  return (
    <UploadMaterial
      onUpload={async (file, title, type) => {
        console.log("Upload:", file.name, title, type);
        await new Promise((r) => setTimeout(r, 1500));
      }}
      onCancel={() => console.log("Cancel upload")}
    />
  );
}
