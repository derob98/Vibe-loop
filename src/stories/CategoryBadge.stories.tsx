import type { Meta, StoryObj } from "@storybook/react";
import { CategoryBadge } from "@/components/ui/CategoryBadge";

const meta: Meta<typeof CategoryBadge> = {
  title: "UI/CategoryBadge",
  component: CategoryBadge,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    category: {
      control: "select",
      options: ["music", "tech", "art", "food", "sport", "cinema", "teatro", "festival", "nightlife"],
    },
    size: {
      control: "select",
      options: ["sm", "md"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof CategoryBadge>;

export const Music: Story = {
  args: { category: "music", size: "sm" },
};

export const Tech: Story = {
  args: { category: "tech", size: "sm" },
};

export const Art: Story = {
  args: { category: "art", size: "sm" },
};

export const AllCategories: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {["music", "tech", "art", "food", "sport", "cinema", "teatro", "festival", "nightlife"].map(
        (cat) => <CategoryBadge key={cat} category={cat} size="sm" />
      )}
    </div>
  ),
};

export const LargeSize: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {["music", "tech", "art", "food"].map(
        (cat) => <CategoryBadge key={cat} category={cat} size="md" />
      )}
    </div>
  ),
};
