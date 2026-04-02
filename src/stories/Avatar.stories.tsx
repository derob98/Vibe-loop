import type { Meta, StoryObj } from "@storybook/react";
import { Avatar } from "@/components/ui/Avatar";

const meta: Meta<typeof Avatar> = {
  title: "UI/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl"],
    },
    src: { control: "text" },
    name: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithInitials: Story = {
  args: { name: "Gianluca De Robertis", size: "md" },
};

export const WithImage: Story = {
  args: {
    src: "https://i.pravatar.cc/150?img=12",
    name: "Marco Rossi",
    size: "md",
  },
};

export const NoName: Story = {
  args: { size: "md" },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Avatar name="Anna Verdi" size="xs" />
      <Avatar name="Anna Verdi" size="sm" />
      <Avatar name="Anna Verdi" size="md" />
      <Avatar name="Anna Verdi" size="lg" />
      <Avatar name="Anna Verdi" size="xl" />
    </div>
  ),
};

export const ColorVariants: Story = {
  render: () => (
    <div className="flex gap-3">
      {["Gianluca", "Beatrice", "Marco", "Simone", "Elena"].map((name) => (
        <Avatar key={name} name={name} size="lg" />
      ))}
    </div>
  ),
};
