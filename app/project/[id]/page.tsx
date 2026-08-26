import { use } from "react";
import { ProjectContainer } from "@/containers";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProjectContainer id={id} />;
}
