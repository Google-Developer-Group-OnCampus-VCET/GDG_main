import { SectionHeading } from "@/components/ui/section-heading";
import { EventsExplorerSkeleton, GoogleBrandBar } from "@/components/skeletons/event-skeletons";

export default function Loading() {
  return (
    <div className="w-full">
      <GoogleBrandBar />
      <div className="mx-auto max-w-(--container-max) px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        <div className="mb-10">
          <SectionHeading
            eyebrow="Events"
            title="Events"
            description="Browse upcoming sessions and past event recaps from the chapter."
          />
        </div>
        <EventsExplorerSkeleton />
      </div>
    </div>
  );
}
