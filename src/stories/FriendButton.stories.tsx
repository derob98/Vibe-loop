import type { Meta, StoryObj } from "@storybook/react";
import { FriendButton } from "@/components/ui/FriendButton";

const meta: Meta<typeof FriendButton> = {
  title: "UI/FriendButton",
  component: FriendButton,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    status: {
      control: "select",
      options: ["none", "pending_sent", "pending_received", "accepted", "blocked"],
    },
    loading: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof FriendButton>;

const noop = () => {};

export const None: Story = {
  args: {
    status: "none",
    loading: false,
    onSend: noop,
    onAccept: noop,
    onDecline: noop,
    onRemove: noop,
  },
};

export const PendingSent: Story = {
  args: {
    status: "pending_sent",
    loading: false,
    onSend: noop,
    onAccept: noop,
    onDecline: noop,
    onRemove: noop,
  },
};

export const PendingReceived: Story = {
  args: {
    status: "pending_received",
    loading: false,
    onSend: noop,
    onAccept: noop,
    onDecline: noop,
    onRemove: noop,
  },
};

export const Accepted: Story = {
  args: {
    status: "accepted",
    loading: false,
    onSend: noop,
    onAccept: noop,
    onDecline: noop,
    onRemove: noop,
  },
};

export const Loading: Story = {
  args: {
    status: "none",
    loading: true,
    onSend: noop,
    onAccept: noop,
    onDecline: noop,
    onRemove: noop,
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <div className="space-y-1 text-center">
        <p className="text-xs text-white/40">none</p>
        <FriendButton status="none" loading={false} onSend={noop} onAccept={noop} onDecline={noop} onRemove={noop} />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-xs text-white/40">pending_sent</p>
        <FriendButton status="pending_sent" loading={false} onSend={noop} onAccept={noop} onDecline={noop} onRemove={noop} />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-xs text-white/40">pending_received</p>
        <FriendButton status="pending_received" loading={false} onSend={noop} onAccept={noop} onDecline={noop} onRemove={noop} />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-xs text-white/40">accepted</p>
        <FriendButton status="accepted" loading={false} onSend={noop} onAccept={noop} onDecline={noop} onRemove={noop} />
      </div>
    </div>
  ),
};
