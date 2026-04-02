import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton, EventCardSkeleton } from "@/components/ui/Skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  args: { className: "h-4 w-48" },
};

export const Rounded: Story = {
  args: { className: "h-10 w-10", rounded: true },
};

export const ProfileSkeleton: Story = {
  render: () => (
    <div className="flex items-center gap-3 p-4">
      <Skeleton className="h-12 w-12" rounded />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  ),
};

export const CardSkeleton: Story = {
  render: () => (
    <div className="w-64">
      <EventCardSkeleton />
    </div>
  ),
};

export const GridSkeleton: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-[600px]">
      <EventCardSkeleton />
      <EventCardSkeleton />
      <EventCardSkeleton />
      <EventCardSkeleton />
    </div>
  ),
};
