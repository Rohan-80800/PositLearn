
import { Modal,Typography,Space } from "antd";
import { Colors } from "../config/color";

const {Paragraph}=Typography

const ConfirmDeleteModal = ({
  visible,
  onConfirm,
  onCancel,
  title = "Confirm Deletion",
  description = "Are you sure you want to delete this item?",
}) => {
  const colors = Colors();
  return (
    <Modal
      title={title}
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      okText="Delete"
      cancelText="Cancel"
      centered
      className="!max-w-[80vw] !sm:max-w-[45vw]  !md:max-w-[35vw] !lg:max-w-[320px]"
      okButtonProps={{
        style: {
          mask: { backgroundColor: colors.maskbg },
          backgroundColor: colors.danger,
          color: colors.white,
          boxShadow: "none",
        },
      }}
      cancelButtonProps={{
        className: "border",
        style: {
          borderColor: colors.danger,
          color: colors.danger,
          boxShadow: "none",
        },
      }}
      closeIcon={<Space style={{ color: colors.textcolor }}>✕</Space>}
    >
      <Paragraph className="text-sm sm:text-base break-words">{description}</Paragraph>
    </Modal>
  );
};

export default ConfirmDeleteModal;
