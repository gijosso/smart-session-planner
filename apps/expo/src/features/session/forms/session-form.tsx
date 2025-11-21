import type React from "react";

import type { SessionType } from "@ssp/api/client";
import type { SessionFormValues } from "@ssp/validators";

import type { ServerError } from "~/utils/form";
import { Button } from "~/components/button";
import { Card } from "~/components/card";
import { SessionFormFields } from "./session-form-fields";
import { useSessionFormLogic } from "./use-session-form-logic";
import { useSessionFormSubmission } from "./use-session-form-submission";

export type SessionFormMode = "create" | "update";

interface SessionFormPropsBase {
  isPending?: boolean;
  serverError?: ServerError;
}

interface CreateSessionFormProps extends SessionFormPropsBase {
  mode: "create";
  onSubmit: (values: {
    title: string;
    type: SessionType;
    startTime: Date;
    endTime: Date;
    priority: number;
    description?: string;
  }) => void;
  initialValues?: Partial<SessionFormValues>;
}

interface UpdateSessionFormProps extends SessionFormPropsBase {
  mode: "update";
  initialValues: {
    title: string;
    type: SessionType;
    startTime: Date | string;
    endTime: Date | string;
    priority: number;
    description?: string | null;
  };
  onSubmit: (values: {
    title?: string;
    type?: SessionType;
    startTime?: Date;
    endTime?: Date;
    priority?: number;
    description?: string;
    completed?: boolean;
  }) => void;
}

type SessionFormProps = CreateSessionFormProps | UpdateSessionFormProps;

// Prop types for wrapper components (without mode)
export type CreateSessionFormWrapperProps = Omit<
  CreateSessionFormProps,
  "mode"
>;
export type UpdateSessionFormWrapperProps = Omit<
  UpdateSessionFormProps,
  "mode"
>;

export const SessionForm: React.FC<SessionFormProps> = (props) => {
  const { mode, onSubmit, isPending = false, serverError } = props;

  // Form logic hook - handles initialization and state management
  const {
    handleSubmit,
    errors,
    isSubmitted,
    formValues,
    setValue,
    formattedInitialValues,
  } = useSessionFormLogic({
    mode,
    initialValues: props.initialValues,
  } as Parameters<typeof useSessionFormLogic>[0]);

  // Submission logic hook - handles form submission
  const onSubmitForm = useSessionFormSubmission(
    mode,
    onSubmit,
    formattedInitialValues,
  );

  const buttonText = mode === "create" ? "Create Session" : "Update Session";
  const pendingText = mode === "create" ? "Creating..." : "Updating...";

  return (
    <>
      <Card>
        <SessionFormFields
          mode={mode}
          formValues={formValues}
          errors={errors}
          isSubmitted={isSubmitted}
          serverError={serverError}
          setValue={setValue}
        />
      </Card>

      <Button
        variant="default"
        size="lg"
        onPress={handleSubmit(onSubmitForm)}
        disabled={isPending}
      >
        {isPending ? pendingText : buttonText}
      </Button>
    </>
  );
};

// Export convenience wrappers for backward compatibility
// These wrappers automatically set the mode prop
export const CreateSessionForm: React.FC<CreateSessionFormWrapperProps> = (
  props,
) => <SessionForm {...props} mode="create" />;

export const UpdateSessionForm: React.FC<UpdateSessionFormWrapperProps> = (
  props,
) => <SessionForm {...props} mode="update" />;
