import type { Meta, StoryObj } from "@storybook/react";
import { EventCard } from "@/components/ui/EventCard";
import type { Event } from "@/lib/supabase/types";

const mockEvent: Event = {
  id: "evt-001",
  creator_id: "user-001",
  title: "Aperitivo Jazz al Naviglio",
  slug: "aperitivo-jazz-naviglio",
  description: "Una serata jazz con i migliori musicisti milanesi, aperitivo incluso.",
  category: "music",
  visibility: "public",
  source_url: null,
  source_name: null,
  starts_at: "2026-04-15T19:00:00Z",
  ends_at: "2026-04-15T23:00:00Z",
  timezone: "Europe/Rome",
  venue_name: "Bar Naviglio Grande",
  address_line: "Via Alzaia Naviglio Grande, 32",
  city: "Milano",
  region: "Lombardia",
  country: "IT",
  latitude: 45.45,
  longitude: 9.17,
  geom: null,
  location: null,
  cover_image_url: null,
  price_label: "Ingresso libero",
  external_id: null,
  normalized_hash: null,
  search_document: null,
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-01T00:00:00Z",
};

const techEvent: Event = {
  ...mockEvent,
  id: "evt-002",
  title: "React Milano Meetup — AI & Frontend",
  slug: "react-milano-meetup",
  category: "tech",
  venue_name: "Talent Garden Milano",
  city: "Milano",
  price_label: "Gratuito",
  cover_image_url: null,
};

const foodEvent: Event = {
  ...mockEvent,
  id: "evt-003",
  title: "Sagra della Focaccia Ligure",
  slug: "sagra-focaccia-ligure",
  category: "food",
  venue_name: "Piazza Duomo",
  city: "Genova",
  price_label: "€5",
};

const meta: Meta<typeof EventCard> = {
  title: "UI/EventCard",
  component: EventCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    nextjs: { appDirectory: true },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "hero", "compact"],
    },
    isSaved: { control: "boolean" },
    distanceKm: { control: "number" },
  },
};

export default meta;
type Story = StoryObj<typeof EventCard>;

export const Default: Story = {
  args: {
    event: mockEvent,
    variant: "default",
    isSaved: false,
    distanceKm: 1.2,
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
};

export const Hero: Story = {
  args: {
    event: mockEvent,
    variant: "hero",
    isSaved: false,
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-xl">
        <Story />
      </div>
    ),
  ],
};

export const Compact: Story = {
  args: {
    event: mockEvent,
    variant: "compact",
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const Saved: Story = {
  args: {
    event: mockEvent,
    variant: "default",
    isSaved: true,
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
};

export const GridDefault: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 max-w-3xl">
      <EventCard event={mockEvent} variant="default" distanceKm={0.8} />
      <EventCard event={techEvent} variant="default" distanceKm={2.3} />
      <EventCard event={foodEvent} variant="default" distanceKm={5.1} />
    </div>
  ),
};

export const CompactList: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <EventCard event={mockEvent} variant="compact" />
      <EventCard event={techEvent} variant="compact" />
      <EventCard event={foodEvent} variant="compact" />
    </div>
  ),
};
