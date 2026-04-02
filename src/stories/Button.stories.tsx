import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/Button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost", "danger"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { variant: "primary", size: "md", children: "Esplora eventi" },
};

export const Secondary: Story = {
  args: { variant: "secondary", size: "md", children: "Salva" },
};

export const Ghost: Story = {
  args: { variant: "ghost", size: "md", children: "Annulla" },
};

export const Danger: Story = {
  args: { variant: "danger", size: "md", children: "Elimina account" },
};

export const Small: Story = {
  args: { variant: "primary", size: "sm", children: "Aggiungi" },
};

export const Large: Story = {
  args: { variant: "primary", size: "lg", children: "Inizia subito" },
};

export const Loading: Story = {
  args: { variant: "primary", size: "md", loading: true, children: "Caricamento..." },
};

export const Disabled: Story = {
  args: { variant: "primary", size: "md", disabled: true, children: "Non disponibile" },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
